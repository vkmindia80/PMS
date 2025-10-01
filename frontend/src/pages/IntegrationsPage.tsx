/**
 * Enterprise Integration Platform - Phase 4.2 Enhancement
 * Step-by-step setup wizards for Slack, Teams, GitHub, Google Workspace
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
  Search,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  Info,
  Link,
  Copy,
  Loader
} from 'lucide-react'
import axios from 'axios'

import { getApiUrl } from '../utils/environment'
const getApiBaseUrl = () => getApiUrl()

interface Integration {
  type?: string
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

interface WizardStep {
  id: string
  title: string
  description: string
  completed: boolean
  optional?: boolean
}

interface ValidationResult {
  valid: boolean
  connection_status?: string
  errors?: string[]
  warnings?: string[]
  timestamp: Date
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
  const [currentView, setCurrentView] = useState<'overview' | 'setup' | 'management' | 'monitoring'>('overview')

  // Enhanced wizard state
  const [currentWizardStep, setCurrentWizardStep] = useState(0)
  const [wizardSteps, setWizardSteps] = useState<WizardStep[]>([])
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({})
  const [oauthInProgress, setOauthInProgress] = useState<Record<string, boolean>>({})
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'failed'>>({})
  const [setupProgress, setSetupProgress] = useState<Record<string, number>>({})

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
  }, [])

  // Enhanced wizard steps configuration
  const getWizardSteps = (type: string): WizardStep[] => {
    switch (type) {
      case 'slack':
        return [
          { id: 'workspace', title: 'Connect Workspace', description: 'Connect to your Slack workspace', completed: false },
          { id: 'permissions', title: 'Configure Permissions', description: 'Set up bot permissions and scopes', completed: false },
          { id: 'channels', title: 'Channel Setup', description: 'Configure default channels and notifications', completed: false },
          { id: 'test', title: 'Test & Validate', description: 'Test the connection and validate setup', completed: false }
        ]
      case 'teams':
        return [
          { id: 'app', title: 'App Registration', description: 'Register your Teams application', completed: false },
          { id: 'permissions', title: 'Configure Permissions', description: 'Set up Teams permissions and scopes', completed: false },
          { id: 'features', title: 'Enable Features', description: 'Configure adaptive cards and bot features', completed: false },
          { id: 'test', title: 'Test & Validate', description: 'Test Teams integration', completed: false }
        ]
      case 'github':
        return [
          { id: 'oauth', title: 'GitHub OAuth', description: 'Authorize GitHub access', completed: false },
          { id: 'repositories', title: 'Select Repositories', description: 'Choose repositories to integrate', completed: false },
          { id: 'webhooks', title: 'Configure Webhooks', description: 'Set up webhook notifications', completed: false },
          { id: 'test', title: 'Test & Validate', description: 'Validate GitHub integration', completed: false }
        ]
      case 'google_workspace':
        return [
          { id: 'service-account', title: 'Service Account', description: 'Configure Google service account', completed: false },
          { id: 'domain', title: 'Domain Setup', description: 'Configure domain and delegated access', completed: false },
          { id: 'services', title: 'Enable Services', description: 'Choose Google Workspace services', completed: false },
          { id: 'test', title: 'Test & Validate', description: 'Test Google Workspace connection', completed: false }
        ]
      default:
        return []
    }
  }

  // Enhanced real-time validation
  const validateConfigurationLive = async (type: string): Promise<ValidationResult> => {
    try {
      setConnectionStatus(prev => ({ ...prev, [type]: 'testing' }))
      
      const response = await axios.post(
        `${getApiBaseUrl()}/api/integrations/${type}/validate`,
        {},
        { headers: getAuthHeaders() }
      )
      
      const result: ValidationResult = {
        valid: response.data.valid,
        connection_status: response.data.connection_status,
        errors: response.data.errors || [],
        warnings: response.data.warnings || [],
        timestamp: new Date()
      }

      setConnectionStatus(prev => ({ 
        ...prev, 
        [type]: result.valid ? 'success' : 'failed' 
      }))
      
      setValidationResults(prev => ({ ...prev, [type]: result }))
      return result
      
    } catch (error) {
      const errorResult: ValidationResult = {
        valid: false,
        connection_status: 'failed',
        errors: ['Connection failed'],
        timestamp: new Date()
      }
      
      setConnectionStatus(prev => ({ ...prev, [type]: 'failed' }))
      setValidationResults(prev => ({ ...prev, [type]: errorResult }))
      return errorResult
    }
  }

  const renderWizardStep = (type: string, step: WizardStep, stepIndex: number) => {
    switch (`${type}-${step.id}`) {
      // Slack Wizard Steps
      case 'slack-workspace':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center mb-2">
                <Slack className="w-5 h-5 text-blue-600 mr-2" />
                <h4 className="font-semibold text-blue-900">Connect to Slack Workspace</h4>
              </div>
              <p className="text-blue-800 text-sm mb-4">
                Connect your Slack workspace to enable real-time notifications and team collaboration features.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Workspace URL</label>
                  <input
                    type="url"
                    value={slackConfig.workspace_url}
                    onChange={(e) => setSlackConfig({ ...slackConfig, workspace_url: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://yourcompany.slack.com"
                  />
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">What you'll get:</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Real-time project notifications</li>
                    <li>• Task assignment alerts</li>
                    <li>• Team collaboration updates</li>
                    <li>• Integration with project channels</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={() => startOAuthFlow('slack')}
                disabled={oauthInProgress.slack || !slackConfig.workspace_url}
                className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {oauthInProgress.slack ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                {oauthInProgress.slack ? 'Connecting...' : 'Connect to Slack'}
              </button>
            </div>
          </div>
        )

      case 'slack-permissions':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center mb-2">
                <Shield className="w-5 h-5 text-green-600 mr-2" />
                <h4 className="font-semibold text-green-900">Configure Permissions & Bot Settings</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
                  <div className="relative">
                    <input
                      type={showCredentials.slack ? 'text' : 'password'}
                      value={slackConfig.bot_token}
                      onChange={(e) => setSlackConfig({ ...slackConfig, bot_token: e.target.value })}
                      className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="xoxb-your-bot-token"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredentials({ ...showCredentials, slack: !showCredentials.slack })}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showCredentials.slack ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Get your bot token from your Slack app's OAuth & Permissions page
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={slackConfig.notifications_enabled}
                      onChange={(e) => setSlackConfig({ ...slackConfig, notifications_enabled: e.target.checked })}
                      className="mr-2"
                    />
                    <div>
                      <span className="text-sm font-medium">Notifications</span>
                      <p className="text-xs text-gray-500">Enable real-time notifications</p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={slackConfig.enable_slash_commands}
                      onChange={(e) => setSlackConfig({ ...slackConfig, enable_slash_commands: e.target.checked })}
                      className="mr-2"
                    />
                    <div>
                      <span className="text-sm font-medium">Slash Commands</span>
                      <p className="text-xs text-gray-500">Enable /portfolio commands</p>
                    </div>
                  </label>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Required Bot Scopes:</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                    <span>• channels:read</span>
                    <span>• chat:write</span>
                    <span>• users:read</span>
                    <span>• files:write</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'slack-channels':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center mb-2">
                <MessageSquare className="w-5 h-5 text-purple-600 mr-2" />
                <h4 className="font-semibold text-purple-900">Channel Configuration</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Notification Channel</label>
                  <input
                    type="text"
                    value={slackConfig.default_channel}
                    onChange={(e) => setSlackConfig({ ...slackConfig, default_channel: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="general"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notification Types</label>
                  <div className="space-y-2">
                    {[
                      { key: 'task_assigned', label: 'Task Assignments' },
                      { key: 'project_update', label: 'Project Updates' },
                      { key: 'deadline_approaching', label: 'Deadline Alerts' },
                      { key: 'team_mentions', label: 'Team Mentions' }
                    ].map(notif => (
                      <label key={notif.key} className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={slackConfig.notification_types.includes(notif.key)}
                          onChange={(e) => {
                            const types = e.target.checked 
                              ? [...slackConfig.notification_types, notif.key]
                              : slackConfig.notification_types.filter(t => t !== notif.key)
                            setSlackConfig({ ...slackConfig, notification_types: types })
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{notif.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours Start</label>
                    <input
                      type="time"
                      value={slackConfig.working_hours.start}
                      onChange={(e) => setSlackConfig({ 
                        ...slackConfig, 
                        working_hours: { ...slackConfig.working_hours, start: e.target.value }
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours End</label>
                    <input
                      type="time"
                      value={slackConfig.working_hours.end}
                      onChange={(e) => setSlackConfig({ 
                        ...slackConfig, 
                        working_hours: { ...slackConfig.working_hours, end: e.target.value }
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'slack-test':
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center mb-2">
                <PlayCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <h4 className="font-semibold text-yellow-900">Test & Validate Connection</h4>
              </div>
              <p className="text-yellow-800 text-sm mb-4">
                Test your Slack integration to ensure everything is working correctly.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => testIntegration('slack')}
                  disabled={isLoading || !slackConfig.bot_token}
                  className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  {isLoading ? 'Testing...' : 'Send Test Message'}
                </button>

                {testResults.slack && (
                  <div className={`p-3 rounded-lg border ${
                    testResults.slack.success 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center">
                      {testResults.slack.success ? 
                        <CheckCircle className="w-4 h-4 mr-2" /> : 
                        <AlertCircle className="w-4 h-4 mr-2" />
                      }
                      <span className="font-medium">
                        {testResults.slack.success ? 'Connection Successful!' : 'Connection Failed'}
                      </span>
                    </div>
                    {testResults.slack.message && (
                      <p className="text-sm mt-1">{testResults.slack.message}</p>
                    )}
                    {testResults.slack.error && (
                      <p className="text-sm mt-1">{testResults.slack.error}</p>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 p-3 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Connection Summary:</h5>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Workspace:</span>
                      <span className="font-medium">{slackConfig.workspace_url || 'Not configured'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Default Channel:</span>
                      <span className="font-medium">#{slackConfig.default_channel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Notifications:</span>
                      <span className="font-medium">{slackConfig.notifications_enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bot Token:</span>
                      <span className="font-medium">{slackConfig.bot_token ? 'Configured' : 'Missing'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      // Teams Wizard Steps
      case 'teams-app':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center mb-2">
                <Users className="w-5 h-5 text-blue-600 mr-2" />
                <h4 className="font-semibold text-blue-900">Microsoft Teams App Registration</h4>
              </div>
              <p className="text-blue-800 text-sm mb-4">
                Register your application in Azure AD to enable Teams integration.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
                  <input
                    type="text"
                    value={teamsConfig.tenant_id}
                    onChange={(e) => setTeamsConfig({ ...teamsConfig, tenant_id: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="your-tenant-id"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Application ID</label>
                  <input
                    type="text"
                    value={teamsConfig.application_id}
                    onChange={(e) => setTeamsConfig({ ...teamsConfig, application_id: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="your-application-id"
                  />
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Setup Steps:</h5>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Go to Azure AD &gt; App registrations</li>
                    <li>Create new registration for "Portfolio Management Bot"</li>
                    <li>Add redirect URI: {window.location.origin}/integrations/callback/teams</li>
                    <li>Copy Tenant ID and Application ID above</li>
                  </ol>
                </div>
                <button
                  onClick={() => startOAuthFlow('teams')}
                  disabled={oauthInProgress.teams || !teamsConfig.tenant_id || !teamsConfig.application_id}
                  className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {oauthInProgress.teams ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                  {oauthInProgress.teams ? 'Connecting...' : 'Authorize Teams Access'}
                </button>
              </div>
            </div>
          </div>
        )

      case 'teams-permissions':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center mb-2">
                <Shield className="w-5 h-5 text-green-600 mr-2" />
                <h4 className="font-semibold text-green-900">Configure Permissions & Scopes</h4>
              </div>
              <p className="text-green-800 text-sm mb-4">
                Set up Microsoft Teams permissions and bot framework capabilities.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                  <div className="relative">
                    <input
                      type={showCredentials.teams ? 'text' : 'password'}
                      value={teamsConfig.client_secret}
                      onChange={(e) => setTeamsConfig({ ...teamsConfig, client_secret: e.target.value })}
                      className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="your-client-secret"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredentials({ ...showCredentials, teams: !showCredentials.teams })}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showCredentials.teams ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Team</label>
                  <input
                    type="text"
                    value={teamsConfig.default_team}
                    onChange={(e) => setTeamsConfig({ ...teamsConfig, default_team: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="General"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={teamsConfig.bot_framework_enabled}
                      onChange={(e) => setTeamsConfig({ ...teamsConfig, bot_framework_enabled: e.target.checked })}
                      className="mr-2"
                    />
                    <div>
                      <span className="text-sm font-medium">Bot Framework</span>
                      <p className="text-xs text-gray-500">Enable bot interactions</p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={teamsConfig.enable_adaptive_cards}
                      onChange={(e) => setTeamsConfig({ ...teamsConfig, enable_adaptive_cards: e.target.checked })}
                      className="mr-2"
                    />
                    <div>
                      <span className="text-sm font-medium">Adaptive Cards</span>
                      <p className="text-xs text-gray-500">Rich interactive cards</p>
                    </div>
                  </label>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Required Microsoft Graph Permissions:</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                    <span>• TeamsActivity.Send</span>
                    <span>• Chat.ReadWrite</span>
                    <span>• Team.ReadBasic.All</span>
                    <span>• TeamsAppInstallation.ReadWrite</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'teams-features':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center mb-2">
                <Settings className="w-5 h-5 text-purple-600 mr-2" />
                <h4 className="font-semibold text-purple-900">Enable Integration Features</h4>
              </div>
              <p className="text-purple-800 text-sm mb-4">
                Configure advanced Teams features and collaboration tools.
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={teamsConfig.meeting_integration}
                      onChange={(e) => setTeamsConfig({ ...teamsConfig, meeting_integration: e.target.checked })}
                      className="mr-3"
                    />
                    <div className="flex items-center">
                      <Video className="w-4 h-4 mr-2 text-blue-600" />
                      <div>
                        <span className="text-sm font-medium">Meeting Integration</span>
                        <p className="text-xs text-gray-500">Auto-join project meetings</p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={teamsConfig.file_sharing}
                      onChange={(e) => setTeamsConfig({ ...teamsConfig, file_sharing: e.target.checked })}
                      className="mr-3"
                    />
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-green-600" />
                      <div>
                        <span className="text-sm font-medium">File Sharing</span>
                        <p className="text-xs text-gray-500">Share project files</p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={teamsConfig.calendar_sync}
                      onChange={(e) => setTeamsConfig({ ...teamsConfig, calendar_sync: e.target.checked })}
                      className="mr-3"
                    />
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-orange-600" />
                      <div>
                        <span className="text-sm font-medium">Calendar Sync</span>
                        <p className="text-xs text-gray-500">Sync project deadlines</p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={teamsConfig.presence_sync}
                      onChange={(e) => setTeamsConfig({ ...teamsConfig, presence_sync: e.target.checked })}
                      className="mr-3"
                    />
                    <div className="flex items-center">
                      <Activity className="w-4 h-4 mr-2 text-purple-600" />
                      <div>
                        <span className="text-sm font-medium">Presence Sync</span>
                        <p className="text-xs text-gray-500">Show team availability</p>
                      </div>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tab Apps</label>
                  <div className="space-y-2">
                    {['tasks', 'projects', 'analytics', 'timeline'].map(app => (
                      <label key={app} className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={teamsConfig.tab_apps.includes(app)}
                          onChange={(e) => {
                            const apps = e.target.checked 
                              ? [...teamsConfig.tab_apps, app]
                              : teamsConfig.tab_apps.filter(a => a !== app)
                            setTeamsConfig({ ...teamsConfig, tab_apps: apps })
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm capitalize">{app} Tab</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <h5 className="font-medium text-green-900 mb-2">Teams Integration Benefits:</h5>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Rich adaptive cards for project updates</li>
                    <li>• Meeting transcription and action items</li>
                    <li>• Collaborative document editing</li>
                    <li>• Automated workflow notifications</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )

      case 'teams-test':
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center mb-2">
                <PlayCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <h4 className="font-semibold text-yellow-900">Test Teams Integration</h4>
              </div>
              <p className="text-yellow-800 text-sm mb-4">
                Test your Microsoft Teams integration to ensure everything is working correctly.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => testIntegration('teams')}
                  disabled={isLoading || !teamsConfig.client_secret}
                  className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  {isLoading ? 'Testing...' : 'Send Test Adaptive Card'}
                </button>

                {testResults.teams && (
                  <div className={`p-3 rounded-lg border ${
                    testResults.teams.success 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center">
                      {testResults.teams.success ? 
                        <CheckCircle className="w-4 h-4 mr-2" /> : 
                        <AlertCircle className="w-4 h-4 mr-2" />
                      }
                      <span className="font-medium">
                        {testResults.teams.success ? 'Teams Integration Successful!' : 'Connection Failed'}
                      </span>
                    </div>
                    {testResults.teams.message && (
                      <p className="text-sm mt-1">{testResults.teams.message}</p>
                    )}
                    {testResults.teams.error && (
                      <p className="text-sm mt-1">{testResults.teams.error}</p>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 p-3 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Connection Summary:</h5>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Tenant ID:</span>
                      <span className="font-medium">{teamsConfig.tenant_id || 'Not configured'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Application ID:</span>
                      <span className="font-medium">{teamsConfig.application_id || 'Not configured'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Default Team:</span>
                      <span className="font-medium">{teamsConfig.default_team || 'General'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bot Framework:</span>
                      <span className="font-medium">{teamsConfig.bot_framework_enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Adaptive Cards:</span>
                      <span className="font-medium">{teamsConfig.enable_adaptive_cards ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      // GitHub Wizard Steps
      case 'github-oauth':
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center mb-2">
                <Github className="w-5 h-5 text-gray-800 mr-2" />
                <h4 className="font-semibold text-gray-900">Connect to GitHub</h4>
              </div>
              <p className="text-gray-700 text-sm mb-4">
                Authorize GitHub access to sync repositories, issues, and pull requests with your portfolio projects.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Organization</label>
                  <input
                    type="text"
                    value={githubConfig.organization}
                    onChange={(e) => setGithubConfig({ ...githubConfig, organization: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                    placeholder="your-organization"
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">GitHub Integration Benefits:</h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Repository and branch synchronization</li>
                    <li>• Automated issue and PR tracking</li>
                    <li>• Deployment status monitoring</li>
                    <li>• Code review workflow integration</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={() => startOAuthFlow('github')}
                disabled={oauthInProgress.github || !githubConfig.organization}
                className="mt-4 w-full px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center"
              >
                {oauthInProgress.github ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Github className="w-4 h-4 mr-2" />}
                {oauthInProgress.github ? 'Authorizing...' : 'Authorize GitHub Access'}
              </button>
            </div>
          </div>
        )

      case 'github-repositories':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center mb-2">
                <Database className="w-5 h-5 text-green-600 mr-2" />
                <h4 className="font-semibold text-green-900">Select Repositories</h4>
              </div>
              <p className="text-green-800 text-sm mb-4">
                Choose which repositories to integrate with your portfolio management system.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repository Names</label>
                  <input
                    type="text"
                    onChange={(e) => setGithubConfig({ 
                      ...githubConfig, 
                      repositories: e.target.value.split(',').map(r => r.trim()).filter(r => r) 
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="frontend, backend, mobile-app, docs"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated list of repository names</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={githubConfig.auto_sync}
                      onChange={(e) => setGithubConfig({ ...githubConfig, auto_sync: e.target.checked })}
                      className="mr-2"
                    />
                    <div>
                      <span className="text-sm font-medium">Auto Sync</span>
                      <p className="text-xs text-gray-500">Automatically sync changes</p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={githubConfig.issue_sync}
                      onChange={(e) => setGithubConfig({ ...githubConfig, issue_sync: e.target.checked })}
                      className="mr-2"
                    />
                    <div>
                      <span className="text-sm font-medium">Issue Sync</span>
                      <p className="text-xs text-gray-500">Sync GitHub issues as tasks</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )

      case 'github-webhooks':
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center mb-2">
                <Zap className="w-5 h-5 text-orange-600 mr-2" />
                <h4 className="font-semibold text-orange-900">Configure Webhooks</h4>
              </div>
              <p className="text-orange-800 text-sm mb-4">
                Set up webhook notifications for real-time updates from GitHub.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
                  <div className="relative">
                    <input
                      type={showCredentials.github ? 'text' : 'password'}
                      value={githubConfig.webhook_secret}
                      onChange={(e) => setGithubConfig({ ...githubConfig, webhook_secret: e.target.value })}
                      className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="Your webhook secret key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredentials({ ...showCredentials, github: !showCredentials.github })}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showCredentials.github ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Webhook URL:</h5>
                  <code className="text-sm text-blue-800 bg-blue-100 p-2 rounded block">
                    {window.location.origin}/api/integrations/github/webhook
                  </code>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={githubConfig.deployment_tracking}
                      onChange={(e) => setGithubConfig({ ...githubConfig, deployment_tracking: e.target.checked })}
                      className="mr-2"
                    />
                    <div>
                      <span className="text-sm font-medium">Deployment Tracking</span>
                      <p className="text-xs text-gray-500">Track deployment status</p>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={githubConfig.release_notifications}
                      onChange={(e) => setGithubConfig({ ...githubConfig, release_notifications: e.target.checked })}
                      className="mr-2"
                    />
                    <div>
                      <span className="text-sm font-medium">Release Notifications</span>
                      <p className="text-xs text-gray-500">Notify on new releases</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )

      case 'github-test':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                <h4 className="font-semibold text-blue-900">Test & Validate</h4>
              </div>
              <p className="text-blue-800 text-sm mb-4">
                Test your GitHub integration to ensure everything is working correctly.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => testIntegration('github')}
                  disabled={!githubConfig.access_token || !githubConfig.organization}
                  className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Test GitHub Connection
                </button>
                {testResults.github && (
                  <div className={`p-3 rounded-lg ${testResults.github.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <p className="text-sm font-medium">
                      {testResults.github.success ? '✅ GitHub integration working!' : '❌ Connection failed'}
                    </p>
                    {testResults.github.repositories && (
                      <p className="text-sm mt-1">
                        Found {testResults.github.repositories.length} repositories
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      // Google Workspace Wizard Steps
      case 'google_workspace-service-account':
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center mb-2">
                <Key className="w-5 h-5 text-orange-600 mr-2" />
                <h4 className="font-semibold text-orange-900">Configure Service Account</h4>
              </div>
              <p className="text-orange-800 text-sm mb-4">
                Set up Google Workspace service account for secure API access to Google services.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Account Key (JSON)</label>
                  <textarea
                    value={googleConfig.service_account_key}
                    onChange={(e) => setGoogleConfig({ ...googleConfig, service_account_key: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                    rows={8}
                    placeholder='{"type": "service_account", "project_id": "...", "private_key_id": "...", ...}'
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Download this JSON file from Google Cloud Console → IAM & Admin → Service Accounts
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Required Setup Steps:</h5>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Create a project in Google Cloud Console</li>
                    <li>Enable Google Workspace APIs (Calendar, Drive, Gmail)</li>
                    <li>Create a service account with domain-wide delegation</li>
                    <li>Download the JSON key file</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )

      case 'google_workspace-domain':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center mb-2">
                <Globe className="w-5 h-5 text-green-600 mr-2" />
                <h4 className="font-semibold text-green-900">Domain Setup & Delegated Access</h4>
              </div>
              <p className="text-green-800 text-sm mb-4">
                Configure your Google Workspace domain and delegated user for admin access.
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                    <input
                      type="text"
                      value={googleConfig.domain}
                      onChange={(e) => setGoogleConfig({ ...googleConfig, domain: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="your-company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delegated Admin User</label>
                    <input
                      type="email"
                      value={googleConfig.delegated_user}
                      onChange={(e) => setGoogleConfig({ ...googleConfig, delegated_user: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="admin@your-company.com"
                    />
                  </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <h5 className="font-medium text-yellow-900 mb-2">Domain-wide Delegation Setup:</h5>
                  <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                    <li>Go to Google Admin Console → Security → API Controls</li>
                    <li>Add your service account client ID to domain-wide delegation</li>
                    <li>Add required OAuth scopes for Calendar, Drive, and Gmail</li>
                    <li>Authorize the service account</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )

      case 'google_workspace-services':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center mb-2">
                <Calendar className="w-5 h-5 text-purple-600 mr-2" />
                <h4 className="font-semibold text-purple-900">Enable Google Workspace Services</h4>
              </div>
              <p className="text-purple-800 text-sm mb-4">
                Choose which Google Workspace services to integrate with your portfolio management.
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={googleConfig.calendar_sync}
                      onChange={(e) => setGoogleConfig({ ...googleConfig, calendar_sync: e.target.checked })}
                      className="mr-3"
                    />
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                      <div>
                        <span className="text-sm font-medium">Google Calendar</span>
                        <p className="text-xs text-gray-500">Sync meetings and schedules</p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={googleConfig.drive_sync}
                      onChange={(e) => setGoogleConfig({ ...googleConfig, drive_sync: e.target.checked })}
                      className="mr-3"
                    />
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-green-600" />
                      <div>
                        <span className="text-sm font-medium">Google Drive</span>
                        <p className="text-xs text-gray-500">File storage and sharing</p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={googleConfig.gmail_sync}
                      onChange={(e) => setGoogleConfig({ ...googleConfig, gmail_sync: e.target.checked })}
                      className="mr-3"
                    />
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-red-600" />
                      <div>
                        <span className="text-sm font-medium">Gmail</span>
                        <p className="text-xs text-gray-500">Email integration</p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={googleConfig.meet_integration}
                      onChange={(e) => setGoogleConfig({ ...googleConfig, meet_integration: e.target.checked })}
                      className="mr-3"
                    />
                    <div className="flex items-center">
                      <Video className="w-4 h-4 mr-2 text-orange-600" />
                      <div>
                        <span className="text-sm font-medium">Google Meet</span>
                        <p className="text-xs text-gray-500">Video meetings</p>
                      </div>
                    </div>
                  </label>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Integration Features:</h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Automatic calendar scheduling for project milestones</li>
                    <li>• Shared Drive folders for project documents</li>
                    <li>• Meeting auto-join for remote team collaboration</li>
                    <li>• Email notifications for task assignments</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )

      case 'google_workspace-test':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                <h4 className="font-semibold text-blue-900">Test Google Workspace Connection</h4>
              </div>
              <p className="text-blue-800 text-sm mb-4">
                Validate your Google Workspace integration setup and permissions.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => testIntegration('google_workspace')}
                  disabled={!googleConfig.service_account_key || !googleConfig.domain || !googleConfig.delegated_user}
                  className="w-full px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Test Google Workspace Connection
                </button>
                {testResults.google_workspace && (
                  <div className={`p-3 rounded-lg ${testResults.google_workspace.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <p className="text-sm font-medium">
                      {testResults.google_workspace.success ? '✅ Google Workspace integration working!' : '❌ Connection failed'}
                    </p>
                    {testResults.google_workspace.services && (
                      <p className="text-sm mt-1">
                        Services tested: {testResults.google_workspace.services.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center py-8">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Configuration step: {step.title}</p>
          </div>
        )
    }
  }

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
      
      const response = await axios.get(
        `${getApiBaseUrl()}/api/integrations/available`,
        { headers: getAuthHeaders() }
      )
      
      setAvailableIntegrations(response.data.available_integrations)
      
      // Load active integrations
      try {
        const activeResponse = await axios.get(
          `${getApiBaseUrl()}/api/integrations/status`,
          { headers: getAuthHeaders() }
        )
        
        if (activeResponse.data.success) {
          setActiveIntegrations(activeResponse.data.integrations)
        }
      } catch (statusError) {
        // Status endpoint might not exist yet, create mock data
        setActiveIntegrations({})
      }
      
    } catch (error: any) {
      console.error('Error loading integrations:', error)
      // Fallback to mock data if endpoints not available
      setAvailableIntegrations({
        slack: {
          name: "Slack",
          description: "Team communication and notifications",
          features: [
            "Real-time notifications",
            "Interactive workflows", 
            "File sharing",
            "Channel management"
          ],
          setup_required: ["workspace_url", "bot_token"]
        },
        teams: {
          name: "Microsoft Teams",
          description: "Microsoft Teams integration with adaptive cards",
          features: [
            "Adaptive cards",
            "Bot framework",
            "Meeting integration", 
            "File collaboration"
          ],
          setup_required: ["tenant_id", "application_id"]
        },
        github: {
          name: "GitHub", 
          description: "Code repository and issue tracking",
          features: [
            "Repository sync",
            "Issue tracking",
            "Pull request management",
            "Deployment tracking"
          ],
          setup_required: ["organization", "access_token"]
        },
        google_workspace: {
          name: "Google Workspace",
          description: "Calendar, Drive, and Gmail integration",
          features: [
            "Calendar sync",
            "Drive file management",
            "Gmail integration",
            "Meeting scheduling"
          ],
          setup_required: ["domain", "service_account_key"]
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Enhanced OAuth Flow Handler
  const startOAuthFlow = async (type: string) => {
    try {
      setOauthInProgress({ ...oauthInProgress, [type]: true })
      
      let oauthUrl = ''
      
      switch (type) {
        case 'slack':
          oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=YOUR_CLIENT_ID&scope=channels:read,chat:write,users:read&redirect_uri=${encodeURIComponent(window.location.origin + '/integrations/callback/slack')}`
          break
        case 'teams':
          oauthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=${encodeURIComponent(window.location.origin + '/integrations/callback/teams')}&scope=https://graph.microsoft.com/TeamsActivity.Send`
          break
        case 'github':
          oauthUrl = `https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID&scope=repo,read:user&redirect_uri=${encodeURIComponent(window.location.origin + '/integrations/callback/github')}`
          break
        case 'google_workspace':
          oauthUrl = `https://accounts.google.com/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&response_type=code&scope=https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive&redirect_uri=${encodeURIComponent(window.location.origin + '/integrations/callback/google')}`
          break
      }
      
      // Open OAuth in popup window
      const popup = window.open(oauthUrl, 'oauth', 'width=500,height=600,scrollbars=yes,resizable=yes')
      
      // Monitor popup for callback
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed)
          setOauthInProgress({ ...oauthInProgress, [type]: false })
          // Refresh integration status
          loadIntegrations()
        }
      }, 1000)
      
    } catch (error) {
      console.error('OAuth flow error:', error)
      setOauthInProgress({ ...oauthInProgress, [type]: false })
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
        `${getApiBaseUrl()}/api/integrations/${type}/validate`,
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
        `${getApiBaseUrl()}/api/integrations/${endpoint}`,
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
            `${getApiBaseUrl()}/api/integrations/slack/notify`,
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
            `${getApiBaseUrl()}/api/integrations/teams/adaptive-card`,
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
            `${getApiBaseUrl()}/api/integrations/github/repositories`,
            { headers: getAuthHeaders() }
          )
          result = { success: true, repositories: githubResult.data.repositories }
          break

        case 'google_workspace':
          const googleResult = await axios.post(
            `${getApiBaseUrl()}/api/integrations/google-workspace/schedule-meeting`,
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

  // Integration Management Dashboard
  const renderManagementDashboard = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Active Integrations</h3>
            <p className="text-sm text-gray-600">Manage and monitor your connected services</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentView('overview')}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Back to Overview
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Object.entries(availableIntegrations).map(([type, integration]) => {
            const isActive = activeIntegrations[type]?.status === 'active'
            const lastSync = activeIntegrations[type]?.last_updated || 'Never'
            
            return (
              <div key={type} className={`p-4 rounded-lg border-2 ${
                isActive 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {type === 'slack' && <Slack className="w-5 h-5 text-green-600" />}
                    {type === 'teams' && <Users className="w-5 h-5 text-blue-600" />}
                    {type === 'github' && <Github className="w-5 h-5 text-gray-800" />}
                    {type === 'google_workspace' && <Calendar className="w-5 h-5 text-orange-600" />}
                    <span className="ml-2 font-medium text-sm">{integration.name}</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    isActive ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  Status: {isActive ? 'Active' : 'Inactive'}
                </p>
                <p className="text-xs text-gray-500">
                  Last sync: {typeof lastSync === 'string' ? lastSync : new Date(lastSync).toLocaleDateString()}
                </p>
                <div className="mt-3 flex space-x-1">
                  <button
                    onClick={() => editIntegrationConfig(type)}
                    className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Edit className="w-3 h-3 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => testIntegration(type)}
                    className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <PlayCircle className="w-3 h-3 inline mr-1" />
                    Test
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Integration Activity Log */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h4>
          <div className="space-y-2">
            {[
              { type: 'slack', action: 'Sent notification', time: '2 minutes ago', status: 'success' },
              { type: 'github', action: 'Repository sync', time: '15 minutes ago', status: 'success' },
              { type: 'google_workspace', action: 'Calendar event created', time: '1 hour ago', status: 'success' },
              { type: 'teams', action: 'Adaptive card sent', time: '3 hours ago', status: 'warning' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded text-sm">
                <div className="flex items-center">
                  {activity.type === 'slack' && <Slack className="w-4 h-4 text-green-600 mr-2" />}
                  {activity.type === 'github' && <Github className="w-4 h-4 text-gray-800 mr-2" />}
                  {activity.type === 'google_workspace' && <Calendar className="w-4 h-4 text-orange-600 mr-2" />}
                  {activity.type === 'teams' && <Users className="w-4 h-4 text-blue-600 mr-2" />}
                  <span>{activity.action}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">{activity.time}</span>
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // Health Monitoring Dashboard
  const renderMonitoringDashboard = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Integration Health Monitoring</h3>
            <p className="text-sm text-gray-600">Real-time status and performance metrics</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentView('overview')}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Back to Overview
            </button>
            <button
              onClick={() => loadIntegrations()}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 inline mr-1" />
              Refresh
            </button>
          </div>
        </div>

        {/* Health Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Object.entries(availableIntegrations).map(([type, integration]) => {
            const status = connectionStatus[type] || 'idle'
            const validation = validationResults[type]
            
            return (
              <div key={type} className="p-4 bg-white border rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{integration.name}</h4>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    status === 'success' ? 'bg-green-100 text-green-800' :
                    status === 'failed' ? 'bg-red-100 text-red-800' :
                    status === 'testing' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {status === 'testing' && <Loader className="w-3 h-3 inline mr-1 animate-spin" />}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </div>
                </div>
                
                {validation && (
                  <div className="space-y-2">
                    {validation.errors && validation.errors.length > 0 && (
                      <div className="text-xs text-red-600">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        {validation.errors[0]}
                      </div>
                    )}
                    {validation.warnings && validation.warnings.length > 0 && (
                      <div className="text-xs text-yellow-600">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        {validation.warnings[0]}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Last checked: {validation.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => validateConfigurationLive(type)}
                  disabled={status === 'testing'}
                  className="mt-3 w-full px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {status === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              API Response Times
            </h4>
            <div className="space-y-3">
              {Object.entries(availableIntegrations).map(([type, integration]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{integration.name}</span>
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">120ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Success Rates (24h)
            </h4>
            <div className="space-y-3">
              {Object.entries(availableIntegrations).map(([type, integration]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{integration.name}</span>
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '98%' }}></div>
                    </div>
                    <span className="text-xs text-gray-500">98.2%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h4 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center">
            <Bell className="w-4 h-4 mr-2" />
            System Alerts
          </h4>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-yellow-800">
              <Info className="w-4 h-4 mr-2" />
              <span>Slack API rate limit: 85% used in current window</span>
            </div>
            <div className="flex items-center text-sm text-yellow-800">
              <Info className="w-4 h-4 mr-2" />
              <span>GitHub webhook response time elevated (+50ms)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

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
        `${getApiBaseUrl()}/api/integrations/${type}`,
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
    const currentSteps = wizardSteps.length > 0 ? wizardSteps : getWizardSteps(type)
    const currentStep = currentSteps[currentWizardStep]
    const isLastStep = currentWizardStep === currentSteps.length - 1
    const canProceed = currentStep?.completed || currentWizardStep < currentSteps.length - 1

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              {getIntegrationIcon(type)}
              <div className="ml-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  {isEditMode ? 'Edit' : 'Setup'} {integration.name} Integration
                </h3>
                <p className="text-sm text-gray-600">Step {currentWizardStep + 1} of {currentSteps.length}: {currentStep?.title}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSetupModal(null)
                setCurrentWizardStep(0)
                setWizardSteps([])
              }}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center">
              {currentSteps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index < currentWizardStep 
                        ? 'bg-green-500 text-white' 
                        : index === currentWizardStep 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-300 text-gray-600'
                    }`}>
                      {index < currentWizardStep ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="ml-2 hidden sm:block">
                      <p className={`text-sm font-medium ${
                        index <= currentWizardStep ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                  {index < currentSteps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-400 mx-3" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            {renderWizardStep(type, currentStep, currentWizardStep)}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              {currentStep?.id === 'test' && (
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    connectionStatus[type] === 'success' 
                      ? 'bg-green-500' 
                      : connectionStatus[type] === 'failed' 
                        ? 'bg-red-500' 
                        : connectionStatus[type] === 'testing' 
                          ? 'bg-yellow-500 animate-pulse' 
                          : 'bg-gray-300'
                  }`} />
                  <span className="text-sm text-gray-600">
                    Connection: {connectionStatus[type] || 'Not tested'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              {currentWizardStep > 0 && (
                <button
                  onClick={() => setCurrentWizardStep(currentWizardStep - 1)}
                  className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </button>
              )}
              
              {!isLastStep ? (
                <button
                  onClick={() => {
                    const updatedSteps = [...currentSteps]
                    updatedSteps[currentWizardStep].completed = true
                    setWizardSteps(updatedSteps)
                    setCurrentWizardStep(currentWizardStep + 1)
                  }}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={() => setupIntegration(type)}
                  disabled={isLoading || (currentStep?.id === 'test' && connectionStatus[type] !== 'success')}
                  className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? 'Setting up...' : 'Complete Setup'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Enhanced Controls */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6 rounded-lg">
            <h1 className="text-2xl font-bold mb-2">Enterprise Integration Platform</h1>
            <p className="text-blue-100">Connect your favorite tools and automate workflows across your organization</p>
            
            {/* Navigation Tabs */}
            <div className="flex space-x-4 mt-4">
              <button
                onClick={() => setCurrentView('overview')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'overview' ? 'bg-white text-blue-600' : 'text-blue-100 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-1" />
                Overview
              </button>
              <button
                onClick={() => setCurrentView('management')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'management' ? 'bg-white text-blue-600' : 'text-blue-100 hover:text-white'
                }`}
              >
                <Database className="w-4 h-4 inline mr-1" />
                Management
              </button>
              <button
                onClick={() => setCurrentView('monitoring')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'monitoring' ? 'bg-white text-blue-600' : 'text-blue-100 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-1" />
                Monitoring
              </button>
            </div>
          </div>

          {/* Search and Filters - Only show in overview */}
          {currentView === 'overview' && (
            <div className="mt-6 bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search integrations..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Integrations</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Render based on current view */}
        {currentView === 'overview' && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Integrations</p>
                    <p className="text-2xl font-semibold text-green-600">
                      {Object.values(activeIntegrations).filter(i => i.status === 'active').length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Available Services</p>
                    <p className="text-2xl font-semibold text-blue-600">{Object.keys(availableIntegrations).length}</p>
                  </div>
                  <Zap className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-2xl font-semibold text-purple-600">98.5%</p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Health Status</p>
                    <p className="text-2xl font-semibold text-green-600">Healthy</p>
                  </div>
                  <Shield className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>

            {/* Integration Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredIntegrations.map(([type, integration]) => {
            const isActive = activeIntegrations[type]?.status === 'active'
            const testResult = testResults[type]
            const connectionState = connectionStatus[type] || 'idle'
            
            return (
              <div key={type} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      {type === 'slack' && <Slack className="w-6 h-6 text-green-600" />}
                      {type === 'teams' && <Users className="w-6 h-6 text-blue-600" />}
                      {type === 'github' && <Github className="w-6 h-6 text-gray-800" />}
                      {type === 'google_workspace' && <Calendar className="w-6 h-6 text-orange-600" />}
                      <h3 className="ml-2 font-semibold text-gray-900">{integration.name}</h3>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>
                  <p className="text-sm text-gray-600">{integration.description}</p>
                </div>

                {/* Features */}
                <div className="p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Features:</h4>
                  <ul className="space-y-1">
                    {integration.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600">
                        <CheckSquare className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Status & Actions */}
                <div className="p-4 border-t border-gray-100">
                  {testResult && (
                    <div className={`mb-3 p-2 rounded text-xs ${
                      testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                      {testResult.success ? '✅ Test successful' : '❌ Test failed'}
                      {testResult.message && <span className="block mt-1">{testResult.message}</span>}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        const steps = getWizardSteps(type)
                        setWizardSteps(steps)
                        setCurrentWizardStep(0)
                        setSetupModal({ type, integration, mode: isActive ? 'edit' : 'setup' })
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {isActive ? 'Configure' : 'Setup'}
                    </button>
                    {isActive && (
                      <button
                        onClick={() => testIntegration(type)}
                        disabled={connectionState === 'testing'}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium disabled:opacity-50"
                      >
                        {connectionState === 'testing' ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <PlayCircle className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
            </div>
          </>
        )}
        
        {currentView === 'management' && renderManagementDashboard()}
        {currentView === 'monitoring' && renderMonitoringDashboard()}

        {/* Enhanced Integration Statistics Dashboard - Only show in overview */}
        {currentView === 'overview' && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Integration Overview */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Integration Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                <div className="text-2xl font-bold text-blue-600">
                  {Object.values(connectionStatus).filter(status => status === 'success').length}
                </div>
                <div className="text-sm text-gray-600">Validated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {Object.values(connectionStatus).filter(status => status === 'testing').length}
                </div>
                <div className="text-sm text-gray-600">Testing</div>
              </div>
            </div>
          </div>

          {/* Real-time Status Monitor */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              System Health
            </h3>
            <div className="space-y-3">
              {Object.entries(availableIntegrations).map(([type, integration]) => {
                const status = activeIntegrations[type]?.status
                const connectionState = connectionStatus[type]
                const validation = validationResults[type]
                
                return (
                  <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center">
                      {getIntegrationIcon(type)}
                      <span className="ml-2 text-sm font-medium text-gray-900">{integration.name}</span>
                    </div>
                    <div className="flex items-center">
                      {connectionState === 'testing' ? (
                        <Loader className="w-4 h-4 animate-spin text-blue-500" />
                      ) : connectionState === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : connectionState === 'failed' ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : status === 'active' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-300" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Integration Health Summary */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Enterprise Integration Platform</h3>
                <p className="text-gray-600">
                  {Object.values(activeIntegrations).filter(i => i.status === 'active').length} of {Object.keys(availableIntegrations).length} integrations active
                  {Object.values(connectionStatus).some(s => s === 'testing') && ' • Testing in progress'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((Object.values(activeIntegrations).filter(i => i.status === 'active').length / Math.max(Object.keys(availableIntegrations).length, 1)) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Integration Coverage</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(Object.values(activeIntegrations).filter(i => i.status === 'active').length / Math.max(Object.keys(availableIntegrations).length, 1)) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>
        )}
      </div>

      {renderEnhancedSetupModal()}
    </div>
  )
}

export default IntegrationsPage